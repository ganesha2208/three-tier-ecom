# --- Networking for the database ---

# RDS lives in the private subnets — never publicly reachable.
resource "aws_db_subnet_group" "main" {
  name       = "${var.project}-db"
  subnet_ids = module.vpc.private_subnets
}

# Allow PostgreSQL (5432) only from inside the VPC.
resource "aws_security_group" "rds" {
  name        = "${var.project}-rds"
  description = "Allow PostgreSQL from within the VPC"
  vpc_id      = module.vpc.vpc_id

  ingress {
    description = "PostgreSQL from inside the VPC"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# --- The PostgreSQL instance ---
resource "aws_db_instance" "main" {
  identifier     = "${var.project}-db"
  engine         = "postgres"
  engine_version = "16"
  instance_class = "db.t3.micro"

  allocated_storage = 20
  storage_encrypted = true

  db_name  = "shopforge"
  username = "shopforge"
  # RDS generates the master password and stores it in AWS Secrets Manager —
  # no password ever lives in this code or in the Terraform state.
  manage_master_user_password = true

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false

  multi_az                = false # single-AZ — cheaper for this project
  backup_retention_period = 0 # backups off — free-tier-restricted account
  skip_final_snapshot     = true # no final snapshot on destroy (dev DB)
}
